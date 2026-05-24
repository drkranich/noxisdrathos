import {

createContext,
useContext,

ReactNode,

} from "react";

import {

UseQueryResult,

} from "@tanstack/react-query";

import {

useRole,

}

from "@/hooks/useRole";

type Role=

"super_admin"

|

"admin"

|

"member"

|

null;

const RoleContext=

createContext<

UseQueryResult<Role>

|

null

>(null);

export function RoleProvider({

children,

}:{

children:

ReactNode;

}){

const role=

useRole();

return(

<RoleContext.Provider

value={role}

>

{children}

</RoleContext.Provider>

);

}

export function useResolvedRole(){

const context=

useContext(
RoleContext
);

if(!context){

throw new Error(

"useResolvedRole must be used inside RoleProvider"

);

}

return context;

}
