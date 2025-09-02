import type { AccessArgs } from 'payload'

export const checkRole = (allRoles: string[], user?: any): boolean => {
  console.log('🔐 Role check debug:')
  console.log('  - User:', user)
  console.log('  - User roles:', user?.roles)
  console.log('  - User role (direct):', user?.role)
  console.log('  - Required roles:', allRoles)

  if (user) {
    // Try different ways to check roles in Payload CMS v3
    if (user.role && allRoles.includes(user.role)) {
      console.log('✅ Role check passed via user.role')
      return true
    }

    if (user.roles && Array.isArray(user.roles)) {
      const hasRole = allRoles.some((role: string) => {
        return user.roles.some((individualRole: any) => {
          return individualRole === role
        })
      })
      if (hasRole) {
        console.log('✅ Role check passed via user.roles array')
        return true
      }
    }

    console.log('❌ Role check failed')
  }
  return false
}

export const admins = ({ req: { user } }: AccessArgs): boolean => {
  if (!user) return false
  return checkRole(['admin'], user)
}

export const adminsOrPublished = ({ req: { user } }: AccessArgs): boolean => {
  if (user && checkRole(['admin'], user)) {
    return true
  }
  return true
}

export const anyone = (): boolean => true

export const validateAccess = (
  req: any,
  res: any,
  pluginOptions: any,
  collectionSlug: string,
): boolean => {
  try {
    const collectionOptions = pluginOptions.collections[collectionSlug]

    if (!collectionOptions) {
      console.error('Collection not configured for translation:', collectionSlug)
      return false
    }

    // Check if user has access to translation
    if (collectionOptions.access?.translate === false) {
      console.error('Translation access denied for collection:', collectionSlug)
      return false
    }

    // Default access control - require admin or user
    if (!req.user) {
      console.error('Authentication required for translation')
      return false
    }

    // Check if user has admin role
    if (!checkRole(['admin'], req.user)) {
      console.error('Admin access required for translation')
      return false
    }

    return true
  } catch (error) {
    console.error('Access validation error:', error)
    return false
  }
}
