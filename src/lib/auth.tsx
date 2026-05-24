import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useQueryClient } from "@tanstack/react-query";

import type {
  Session,
  User,
} from "@supabase/supabase-js";

import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";

import {
  ensureSuperAdminRole,
} from "@/lib/admin-auth.functions";

import type {
  SuperAdminBootstrapResult,
} from "@/lib/admin-auth.functions";

type Role=

"super_admin"

|

"admin"

|

"member";

type RoleRow={

id?:string;

user_id?:string;

role:string;

created_at?:string;

};

type RoleQueryState={

data:RoleRow[]|null;

error:string|null;

source:string;

};

type RolePipelineDiagnostics={

authEmail:string|null;

authUid:string|null;

hydratedRole:

Role

|

"none"

|

"pending";

rawUserRolesRows:

RoleRow[];

cacheRole:

Role

|

"none";

effectiveRole:

Role

|

"none";

guardRole:

"pending"

|

"admin_allowed"

|

"member_or_denied"

|

"anonymous";

roleQuery:

RoleQueryState

|

null;

};

export type AuthContextValue={

session:Session|null;

user:User|null;

loading:boolean;

rolesLoading:boolean;

roles:Role[];

primaryRole:

Role

|

"none";

roleQuery:

RoleQueryState

|

null;

roleDiagnostics:

RolePipelineDiagnostics;

bootstrapResult:

SuperAdminBootstrapResult

|

null;

isAdmin:boolean;

refreshRoles:()=>void;

signOut:()=>Promise<void>;

};

const ROLE_PRIORITY={

super_admin:3,

admin:2,

member:1,

} satisfies Record<Role,number>;

function isRole(

value:string,

):value is Role{

return(

value==="super_admin"

||

value==="admin"

||

value==="member"

);

}

function normalizeRoles(

rows:RoleRow[],

):Role[]{

return Array

.from(

new Set(

rows

.map(

r=>r.role,

)

.filter(

isRole,

),

),

)

.sort(

(a,b)=>

ROLE_PRIORITY[b]

-

ROLE_PRIORITY[a],

);

}

function resolvePrimaryRole(

roles:Role[],

){

return roles[0]

??

"none";

}

const AuthContext=

createContext<

AuthContextValue

|

null

>(null);

export function AuthProvider({

children,

}:{

children:

ReactNode;

}){

const queryClient=

useQueryClient();

const [

session,

setSession,

]=

useState<

Session

|

null

>(null);

const [

loading,

setLoading,

]=

useState(true);

const [

roles,

setRoles,

]=

useState<Role[]>([]);

const [

rolesLoading,

setRolesLoading,

]=

useState(false);

const [

roleQuery,

setRoleQuery,

]=

useState<

RoleQueryState

|

null

>(null);

const [

bootstrapResult,

setBootstrapResult,

]=

useState<

SuperAdminBootstrapResult

|

null

>(null);

const [

roleRefreshNonce,

setRoleRefreshNonce,

]=

useState(0);

const bootstrapSuperAdmin=

useServerFn(

ensureSuperAdminRole,

);

const refreshRoles=

useCallback(

()=>{

setRoleRefreshNonce(

v=>v+1,

);

},

[],

);

useEffect(()=>{

const{

data:listener,

}=

supabase

.auth

.onAuthStateChange(

(

_event,

nextSession,

)=>{

setSession(

nextSession,

);

queryClient

.removeQueries();

queryClient

.invalidateQueries();

if(

nextSession?.user

){

setRoles([]);

setRolesLoading(true);

}

else{

setRoles([]);

setRolesLoading(false);

}

},

);

supabase

.auth

.getSession()

.then(

({data})=>{

setSession(

data.session,

);

setLoading(false);

},

);

return()=>{

listener

.subscription

.unsubscribe();

};

},[queryClient]);

useEffect(()=>{

const uid=

session?.user?.id;

if(

!uid

){

setRoles([]);

setRolesLoading(false);

return;

}

let cancelled=false;

setRolesLoading(true);

bootstrapSuperAdmin({

data:{},

})

.then(

result=>{

if(

!cancelled

){

setBootstrapResult(

result,

);

}

},

)

.catch(

e=>{

console.error(

e,

);

},

);

async function hydrate(){

const response=

await supabase

.from(

"user_roles",

)

.select(

"id,user_id,role,created_at",

)

.eq(

"user_id",

uid,

);

if(

cancelled

){

return;

}

const raw=

response.data

??

[];

const normalized=

normalizeRoles(

raw,

);

setRoles(

normalized,

);

setRoleQuery({

data:raw,

error:

response.error

?.message

??

null,

source:

"user_roles",

});

setRolesLoading(

false,

);

}

hydrate();

return()=>{

cancelled=true;

};

},[

session?.user?.id,

bootstrapSuperAdmin,

roleRefreshNonce,

]);

const primaryRole=

resolvePrimaryRole(

roles,

);

const isAdmin=

primaryRole==="admin"

||

primaryRole==="super_admin";

const roleDiagnostics=

useMemo(

()=>({

authEmail:

session?.user?.email

??

null,

authUid:

session?.user?.id

??

null,

hydratedRole:

rolesLoading

?

"pending"

:

primaryRole,

rawUserRolesRows:

roleQuery?.data

??

[],

cacheRole:

primaryRole,

effectiveRole:

primaryRole,

guardRole:

loading

||

rolesLoading

?

"pending"

:

!session?.user

?

"anonymous"

:

isAdmin

?

"admin_allowed"

:

"member_or_denied",

roleQuery,

}),

[

loading,

rolesLoading,

primaryRole,

roleQuery,

session,

isAdmin,

],

);

const value=

useMemo(

()=>({

session,

user:

session?.user

??

null,

loading,

rolesLoading,

roles,

primaryRole,

roleQuery,

roleDiagnostics,

bootstrapResult,

isAdmin,

refreshRoles,

signOut:

async()=>{

await supabase

.auth

.signOut();

},

}),

[

session,

loading,

rolesLoading,

roles,

primaryRole,

roleQuery,

roleDiagnostics,

bootstrapResult,

isAdmin,

refreshRoles,

],

);

return(

<AuthContext.Provider

value={value}

>

{children}

</AuthContext.Provider>

);

}

export function useAuth(){

const ctx=

useContext(

AuthContext,

);

if(

!ctx

){

throw new Error(

"useAuth requires AuthProvider",

);

}

return ctx;

}
