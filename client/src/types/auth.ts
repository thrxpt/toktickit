export type UserRole = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'

export interface AuthenticatedUser {
  id: number
  name: string
  email: string
  role: UserRole
  mustChangePassword: boolean
}
