import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRole(){

const roleQuery=
useQuery({

queryKey:["user-role"],

queryFn:async()=>{

const {

data:{user},

}=await supabase.auth.getUser();

if(!user){

return null;

}

const {data,error}=

await supabase

.from("user_roles")

.select("role")

.eq("user_id",user.id);

if(error){

throw error;

}

const roles=

data?.map(
r=>r.role
)

??[];

if(

roles.includes(
"super_admin"
)

){

return "super_admin";

}

if(

roles.includes(
"admin"
)

){

return "admin";

}

return "member";

},

staleTime:0,

gcTime:0,

refetchOnMount:true,

refetchOnWindowFocus:true,

});

return roleQuery;

}
