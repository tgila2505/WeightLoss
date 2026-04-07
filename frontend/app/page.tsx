'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { isLoggedIn } from '@/lib/auth'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace('/dashboard')
    } else {
      router.replace('/funnel')
    }
  }, [router])

  return null
}
