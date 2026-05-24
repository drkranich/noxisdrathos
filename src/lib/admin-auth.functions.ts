import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FALLBACK_SUPER_ADMIN_EMAIL =
  "genialidadefilosofica@gmail.com";

export type SuperAdminBootstrapResult = {
  ok: boolean;
  matched: boolean;

  userId: string;

  authEmail: string;

  superAdminEmail: string;

  source:
    | "env"
    | "app fallback";

  roleAssigned: string | null;

  error: string | null;
};

function normalizeEmail(
  email?: string | null,
) {
  return (
    email
      ?.trim()
      .toLowerCase()
      ?? ""
  );
}

export const ensureSuperAdminRole =
createServerFn({
  method:"POST",
})

.middleware([
  requireSupabaseAuth,
])

.inputValidator((input)=>

  z.object({

    observedEmail:

      z
      .string()
      .email()
      .optional(),

  }).parse(input),

)

.handler(
async({

  data,

  context,

})=>{

const { userId } =
context;

const superAdminEmail =
normalizeEmail(

process.env
.SUPER_ADMIN_EMAIL

??

FALLBACK_SUPER_ADMIN_EMAIL

);

const {

data:userRes,

error:userError,

}

=

await supabaseAdmin
.auth
.admin
.getUserById(
userId
);

const authEmail =
normalizeEmail(
userRes
.user
?.email
);


const matched =

authEmail
===
superAdminEmail;

if(
userError
){

return{

ok:false,

matched,

userId,

authEmail,

superAdminEmail: "",

source:

process.env
.SUPER_ADMIN_EMAIL

?

"env"

:

"app fallback",

roleAssigned:null,

error:
userError.message,

};

}

if(
!matched
){

return{

ok:true,

matched:false,

userId,

authEmail,

superAdminEmail: "",

source:

process.env
.SUPER_ADMIN_EMAIL

?

"env"

:

"app fallback",

roleAssigned:null,

error:null,

};

}

const displayName =

userRes
.user
?.user_metadata
?.display_name

??

userRes
.user
?.user_metadata
?.full_name

??

authEmail
.split("@")[0];

await supabaseAdmin

.from("profiles")

.upsert(
{
id: userId,
display_name: displayName,
avatar_url:
userRes
.user
?.user_metadata
?.avatar_url
?? null,
},
{ onConflict: "id" },
);


await supabaseAdmin

.from("user_roles")

.delete()

.eq(

"user_id",

userId,

);

const {

error:roleError,

}

=

await supabaseAdmin

.from("user_roles")

.insert({

user_id:
userId,

role:
"super_admin",

});

if(
roleError
){

return{

ok:false,

matched,

userId,

authEmail,

superAdminEmail: "",

source:

process.env
.SUPER_ADMIN_EMAIL

?

"env"

:

"app fallback",

roleAssigned:null,

error:
roleError.message,

};

}

return{

ok:true,

matched:true,

userId,

authEmail,

superAdminEmail: "",

source:

process.env
.SUPER_ADMIN_EMAIL

?

"env"

:

"app fallback",

roleAssigned:
"super_admin",

error:null,

};

}

);

export const
getAdminDiagnostics =

createServerFn({

method:"GET",

})

.middleware([

requireSupabaseAuth,

])

.handler(

async({

context,

})=>{

const {

userId,

supabase,

}

=

context;

const { data: isAdminRpc } = await supabaseAdmin.rpc("is_admin", { _user_id: userId });
if (!isAdminRpc) {
  throw new Response("Forbidden", { status: 403 });
}

const superAdminEmail =
normalizeEmail(

process.env
.SUPER_ADMIN_EMAIL

??

FALLBACK_SUPER_ADMIN_EMAIL

);


const [

authUser,

profile,

roles,

adminAccess,

]

=

await Promise.all([

supabaseAdmin

.auth

.admin

.getUserById(
userId
),

supabaseAdmin

.from(
"profiles"
)

.select("*")

.eq(
"auth_user_id",
userId,
)

.maybeSingle(),

supabase

.from(
"user_roles"
)

.select("*")

.eq(
"user_id",
userId,
),

supabaseAdmin

.rpc(

"is_admin",

{

_user_id:
userId,

},

),

]);

const email =
normalizeEmail(

authUser
.data
.user
?.email

);

const roleList =

roles.data
?.map(

r=>r.role,

)

??

[];

const resolvedRole =

roleList.includes(
"super_admin"
)

?

"super_admin"

:

roleList.includes(
"admin"
)

?

"admin"

:

roleList[0]

??

"none";

return{

currentEmail:
email,

currentAuthUid:
userId,

currentRole:
resolvedRole,

superAdminEmail,

emailMatchesSuperAdmin:

email===

superAdminEmail,

profile:

profile.data,

profileError:

profile
.error
?.message

??

null,

roles:

roles.data

??

[],

rolesError:

roles
.error
?.message

??

null,

adminAccess:

!!adminAccess
.data,

adminAccessError:

adminAccess
.error
?.message

??

null,

authError:

authUser
.error
?.message

??

null,

};

}

);
