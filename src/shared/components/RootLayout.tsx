// Capa: layout raíz del router.
// Responsabilidad: envolver todas las rutas y alojar overlays de app (splash).

import { Outlet } from 'react-router-dom'
import { PostLoginBootSplash } from '@/shared/components/PostLoginBootSplash'

export function RootLayout() {
  return (
    <>
      <Outlet />
      <PostLoginBootSplash />
    </>
  )
}
