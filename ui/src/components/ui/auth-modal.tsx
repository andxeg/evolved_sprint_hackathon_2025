'use client'

import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Typewriter } from '@/components/ui/typewriter'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const router = useRouter()

  const handleSignup = () => {
    router.push('/signup')
    onOpenChange(false)
  }

  const handleLogin = () => {
    router.push('/login')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">
            Authentication Required
          </DialogTitle>
          <div className="text-center text-2xl font-semibold mb-4">
            <div className="flex items-center justify-center gap-2">
              <span className="flex-shrink-0">{"We are here to help"}</span>
              <div className="min-w-[200px] text-left">
                <Typewriter
                  text={[
                    "research faster",
                    "discover proteins",
                    "accelerate science",
                    "unlock insights",
                    "advance medicine",
                  ]}
                  speed={70}
                  className="text-blue-600"
                  waitTime={1500}
                  deleteSpeed={40}
                  cursorChar={"_"}
                />
              </div>
            </div>
          </div>
          <DialogDescription className="text-center">
            Sign up to save your conversations and access all features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={handleSignup}
            className="w-full"
            size="lg"
          >
            Sign Up
          </Button>
          <Button
            onClick={handleLogin}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Log In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
