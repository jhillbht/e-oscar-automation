// sync-credentials/index.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  // Check admin secret to ensure only authorized calls
  const adminSecret = req.headers.get('x-admin-secret')
  if (adminSecret !== Deno.env.get('ADMIN_SECRET')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // For security reasons in Edge Functions, we'll use a fetch request to a secure internal service
    // that has the necessary permissions to access the Google Sheet
    const response = await fetch(Deno.env.get('SHEETS_API_ENDPOINT') ?? '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SHEETS_API_KEY')}`
      },
      body: JSON.stringify({
        spreadsheetId: '1XrGspfqOI3mlkO-d_MIZYiEyyDHpZjaBqRWXlF6pIQU',
        range: 'Login Credentials!A:D'  // Get columns A-D for all rows
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch credentials: ${response.statusText}`)
    }
    
    const sheetData = await response.json()
    const rows = sheetData.values || []
    
    let syncCount = 0
    let updateCount = 0
    let errorCount = 0
    
    // Process each row (skip header)
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].length >= 4) {  // Ensure row has enough columns
        const clientName = rows[i][0]  // Column A
        const username = rows[i][2]    // Column C
        const password = rows[i][3]    // Column D
        
        if (username && password) {
          try {
            // Hash the password
            const passwordHash = await bcrypt.hash(password, 10)
            
            // Check if user already exists
            const { data: existingUser, error: lookupError } = await supabase
              .from('authorized_users')
              .select('id, password_hash')
              .eq('username', username)
              .single()
            
            if (lookupError && !lookupError.message.includes('No rows found')) {
              console.error(`Error looking up user ${username}:`, lookupError.message)
              errorCount++
              continue
            }
            
            if (existingUser) {
              // Update existing user if password has changed
              const passwordChanged = await bcrypt.compare(password, existingUser.password_hash) === false
              
              if (passwordChanged) {
                const { error: updateError } = await supabase
                  .from('authorized_users')
                  .update({
                    password_hash: passwordHash,
                    client_name: clientName,
                    active: true
                  })
                  .eq('id', existingUser.id)
                
                if (updateError) {
                  console.error(`Error updating user ${username}:`, updateError.message)
                  errorCount++
                } else {
                  updateCount++
                }
              }
            } else {
              // Insert new user
              const { error: insertError } = await supabase
                .from('authorized_users')
                .insert({
                  username,
                  password_hash: passwordHash,
                  client_name: clientName,
                  active: true
                })
              
              if (insertError) {
                console.error(`Error inserting user ${username}:`, insertError.message)
                errorCount++
              } else {
                syncCount++
              }
            }
          } catch (error) {
            console.error(`Error processing user ${username}:`, error.message)
            errorCount++
          }
        }
      }
    }
    
    // Log the sync activity
    await supabase
      .from('sync_logs')
      .insert({
        type: 'manual',
        status: 'success',
        details: {
          total_rows: rows.length - 1,
          new_users: syncCount,
          updated_users: updateCount,
          errors: errorCount
        }
      })
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Credentials synced successfully',
        stats: {
          total_rows: rows.length - 1,
          new_users: syncCount,
          updated_users: updateCount,
          errors: errorCount
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error syncing credentials:', error.message)
    
    // Log the sync failure
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabase
      .from('sync_logs')
      .insert({
        type: 'manual',
        status: 'error',
        details: {
          error: error.message
        }
      })
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to sync credentials',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})