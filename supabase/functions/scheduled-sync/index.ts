// scheduled-sync/index.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-function-key',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  // Verify this is a scheduled function call
  const functionKey = req.headers.get('x-function-key')
  if (functionKey !== Deno.env.get('CRON_KEY')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  try {
    // Call the sync-credentials function
    const syncResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': Deno.env.get('ADMIN_SECRET') ?? ''
      }
    })
    
    if (!syncResponse.ok) {
      throw new Error(`Sync request failed: ${syncResponse.statusText}`)
    }
    
    const result = await syncResponse.json()
    
    // Log the sync activity
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabase
      .from('sync_logs')
      .insert({
        type: 'scheduled',
        status: 'success',
        details: result
      })
    
    return new Response(
      JSON.stringify({
        success: true,
        result
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Scheduled sync error:', error.message)
    
    // Log the sync failure
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabase
      .from('sync_logs')
      .insert({
        type: 'scheduled',
        status: 'error',
        details: {
          error: error.message
        }
      })
    
    return new Response(
      JSON.stringify({ 
        error: 'Scheduled sync failed',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})