import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] ?? "Super Admin";

if (!email || !password) {
    throw new Error("Usage: node scripts/create-super-admin.mjs email@example.com password123 \"Name\"");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
        role: "super_admin",
        name,
    },
});

if (error) {
    throw error;
}

const user = data.user;

const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    name,
    role: "super_admin",
    company: null,
});

if (profileError) {
    throw profileError;
}

console.log(`Super admin created: ${user.email} (${user.id})`);