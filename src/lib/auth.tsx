import {
createContext,
useCallback,
useContext,
useEffect,
useMemo,
useState,
type ReactNode,
} from "react";

import {
useQueryClient,
} from "@tanstack/react-query";

import type {
Session,
User,
} from "@supabase/supabase-js";

import {
supabase,
} from "@/integrations/supabase/client";

type Role=
"super_admin"
|
"admin"
|
"member";

type RoleRow={
role:string;
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

isAdmin:boolean;

refreshRoles:()=>void;

signOut:()=>Promise<void>;

};

const AuthContext=

createContext<
AuthContextValue
|
null
>(null);

function normalizeRoles(
rows:RoleRow[],
):Role[]{

const unique=

new Set<Role>();

for(
const row
of rows
){

if(
row.role==="super_admin"
||
row.role==="admin"
||
row.role==="member"
){

unique.add(
row.role,
);

}

}

return Array
.from(
unique,
)
.sort(
(a,b)=>{

const priority={

super_admin:3,

admin:2,

member:1,

};

return priority[b]
-
priority[a];

},
);

}

export function AuthProvider({

children,

}:{

children:ReactNode;

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
>(
null,
);

const [

loading,

setLoading,

]=

useState(
true,
);

const [

rolesLoading,

setRolesLoading,

]=

useState(
false,
);

const [

roles,

setRoles,

]=

useState<
Role[]
>(
[],
);

const [

refreshNonce,

setRefreshNonce,

]=

useState(
0,
);

const refreshRoles=

useCallback(

()=>{

setRefreshNonce(

v=>v+1,

);

},

[],

);

useEffect(()=>{

async function boot(){

try{

const {

data,

}=

await supabase

.auth

.getSession();

setSession(

data.session,

);

}

finally{

setLoading(

false,

);

}

}

boot();

const {

data,

}=

supabase

.auth

.onAuthStateChange(

(

_event,

next,

)=>{

setSession(

next,

);

queryClient

.clear();

},

);

return()=>{

data.subscription.unsubscribe();

};

},[
queryClient,
]);

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

let mounted=true;

async function hydrate(){

setRolesLoading(true);

try{

console.log(

"AUTH UID",

uid,

);

const {

data,

error,

}=

await supabase

.from(
"user_roles"
)

.select("*")

.eq(
"user_id",
uid
);

console.log(

"ROLE RESPONSE",

data,

);

console.log(

"ROLE ERROR",

error,

);

if(
error
){

throw error;

}

if(
!mounted
){

return;

}

const normalized=

normalizeRoles(

data
??
[],

);

setRoles(

normalized,

);

}

catch(

e

){

console.error(

e,

);

if(

mounted

){

setRoles([]);

}

}

finally{

if(

mounted

){

setRolesLoading(

false,

);

}

}

}

hydrate();

return()=>{

mounted=false;

};

},[
session?.user?.id,
refreshNonce,
]);

const primaryRole=

roles[0]

??

"none";

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

isAdmin:

primaryRole==="admin"

||

primaryRole==="super_admin",

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

"useAuth requires AuthProvider"

);

}

return ctx;

}
