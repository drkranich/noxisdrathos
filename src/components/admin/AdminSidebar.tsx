import {

useResolvedRole,

}

from "@/providers/RoleProvider";

export function AdminSidebar(){

const role=

useResolvedRole();

if(

role.data

!==

"super_admin"

){

return null;

}

return(

<>

<Link

to="/app/admin/content"

>

CMS

</Link>

<Link

to="/app/admin/media"

>

Media

</Link>

<Link

to="/app/admin/uploads"

>

Uploads

</Link>

<Link

to="/app/admin/members"

>

Members

</Link>

<Link

to="/app/admin/collections"

>

Collections

</Link>

</>

);

}
