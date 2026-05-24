import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Role =
  | "super_admin"
  | "admin"
  | "member"
  | null;

export function useRole() {

return useQuery<Role>({

queryKey:["user-role"],

queryFn:async()=>{

const {

data,

error:authError,

}=await supabase.auth.getUser();

if(authError){

console.error(
"Role auth error:",
authError,
);

return null;

}

const user=

data?.user;

if(!user){

return null;

}

const {

data:roleRows,

error,

}=

await supabase

.from("user_roles")

.select("role")

.eq(
"user_id",
user.id,
);

if(error){

console.error(
"Role query error:",
error,
);

return "member";

}

const roles=

roleRows
?.map(
r=>r.role,
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

staleTime:

1000*60,

gcTime:

1000*60*5,

retry:1,

refetchOnWindowFocus:false,

refetchOnReconnect:true,

refetchOnMount:true,

networkMode:

"always",

});

}
