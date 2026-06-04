interface User {
  id: string
  email: string
  name: string
  password: string
  image?: string
  permissions?: string[]
  roles?: string[]
}

const users: User[] = [
  {
    id: "sahadeb@enfysync.com",
    name: "sahadeb",
    email: "sahadeb@enfysync.com",
    password: "password",
    image: '/images/users/user-1.jpg',
  },
  {
    id: "admin@enfycon.com",
    name: "Enfy Admin",
    email: "admin@enfycon.com",
    password: "enfycon123",
    image: '/images/users/user-2.jpg',
  },
  {
    id: "recruiter@enfycon.com",
    name: "Enfy Recruiter",
    email: "recruiter@enfycon.com",
    password: "enfycon123",
    image: '/images/users/user-3.jpg',
  },
  {
    id: "am@enfycon.com",
    name: "Enfy Acct Manager",
    email: "am@enfycon.com",
    password: "enfycon123",
    image: '/images/users/user-4.jpg',
  },
  {
    id: "dh@enfycon.com",
    name: "Enfy Delivery Head",
    email: "dh@enfycon.com",
    password: "enfycon123",
    image: '/images/users/user-5.jpg',
  },
  {
    id: "tracker@enfycon.com",
    name: "Enfy Tracker",
    email: "tracker@enfycon.com",
    password: "enfycon123",
    image: '/images/users/user-1.jpg',
  },
]

export async function getUserFromDb(email: string, hashedPassword: string): Promise<User | null> {
  const find = users.find(user => user.email === email && user.password === hashedPassword)
  return find || null
}
