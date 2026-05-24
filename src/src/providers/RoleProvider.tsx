import {

createContext,
useContext,

} from "react";

import {

useRole,

} from "@/hooks/useRole";

const RoleContext=

createContext(null);

export function RoleProvider({

children,

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

return useContext(
RoleContext
);

}
