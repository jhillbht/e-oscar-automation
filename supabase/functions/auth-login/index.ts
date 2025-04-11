// auth-login/index.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Get username and password from request
    const { username, password } = await req.json()
    
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Fetch user from our authorized_users table
    const { data: user, error } = await supabaseClient
      .from('authorized_users')
      .select('id, username, password_hash, client_name, active')
      .eq('username', username)
      .single()
    
    if (error || !user) {
      // Don't reveal if the username exists or not
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check if user is active
    if (!user.active) {
      return new Response(
        JSON.stringify({ error: 'Account is inactive' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash)
    
    if (!passwordValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Update last login timestamp
    await supabaseClient
      .from('authorized_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)
    
    // Generate a secure email for Supabase Auth
    const email = `${username.replace(/[^a-zA-Z0-9]/g, '')}_${user.id}@dispute-automator.internal`
    
    // Create or update user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: Deno.env.get('INTERNAL_AUTH_PASSWORD') ?? '',
      email_confirm: true,
      user_metadata: {
        username: user.username,
        client_name: user.client_name
      }
    })
    
    if (authError && !authError.message.includes('already been registered')) {
      console.error('Error creating user:', authError)
      return new Response(
        JSON.stringify({ error: 'Authentication error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Sign in with email
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: Deno.env.get('INTERNAL_AUTH_PASSWORD') ?? ''
    })
    
    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return new Response(
        JSON.stringify({ error: 'Session creation error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          username: user.username,
          client_name: user.client_name
        },
        session: sessionData.session
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Authentication error:', error.message)
    return new Response(
      JSON.stringify({ 
        error: 'Authentication failed',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})