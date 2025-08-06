import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

const supabaseUrl = process.env.SUPABASE_URL!
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

// Create Supabase client with anon key for client-side operations
export const supabase = createClient(supabaseUrl, supabasePublishableKey);

// Create Supabase client with service role key for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to get user from Supabase auth with token refresh
export async function getSupabaseUser(token: string) {
  try {
    // Use the admin client to verify the token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error) {
      console.error('Token verification error:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error getting Supabase user:', error)
    return null
  }
}

// Helper function to verify session with auto-refresh
export async function verifySupabaseSession(token: string) {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) throw refreshError
      return refreshData.session
    }
    return session
  } catch (error) {
    console.error('Error verifying Supabase session:', error)
    return null
  }
}

// Helper function to refresh token
export async function refreshSupabaseToken(refreshToken: string) {
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    })
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

// Helper function to create audit log via Supabase
export async function createAuditLog(data: {
  entityType: string
  entityId: string
  action: string
  userId: string
  groupId?: string
  oldData?: any
  newData?: any
  metadata?: any
}) {
  try {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert([{
        ...data,
        version: 1,
        createdAt: new Date().toISOString()
      }])
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error creating audit log:', error)
    return false
  }
}

// Helper function to create auth audit log
export async function createAuthAuditLog(data: {
  action: string
  userId: string
  metadata?: any
}) {
  return createAuditLog({
    entityType: 'auth',
    entityId: data.userId,
    action: data.action,
    userId: data.userId,
    metadata: data.metadata
  })
} 