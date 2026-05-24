import {

useResolvedRole,

}

from "@/providers/RoleProvider";

export function RoleBadge(){

const role=

useResolvedRole();

if(

role.isLoading

){

return <>...</>;

}

return(

<div>

{

role.data

??

"member"

}

</div>

);

}
