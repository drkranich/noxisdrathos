import {

useResolvedRole,

}

from "@/providers/RoleProvider";

export function AdminFooterDebug(){

const role=

useResolvedRole();

return(

<div>

resolved:

{

role.data

}

</div>

);

}
