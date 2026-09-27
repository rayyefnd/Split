'use client'

import { ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'

//Icon
import { 
    Loader2
} from 'lucide-react'

//Dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ConfirmDialogProps {
    title: string
    icon?: ReactNode
    iconBg?: string
    description: string
    trigger?: ReactNode
    confirmLabel?: string
    cancelLabel?: string

    confirmVariant?:
       | 'default'
       | 'destructive'
       | 'outline'
       | 'ghost'
       | 'link'
    
    onConfirm: () => Promise<void> | void
    onCancel?: () => void
    open?: boolean
    onOpenChange?: (open: boolean) => void

    disableCloseOnOverlay?: boolean
}

export const ConfirmDialog = ({
  title,
  icon,
  iconBg,
  description,
  trigger,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
  onConfirm,
  onCancel,
  open: controlledOpen,
  onOpenChange,
  disableCloseOnOverlay = false,
}: ConfirmDialogProps) => {

  const defaultIconBg: Record<string, string> = {
    default: 'bg-slate-100',
    destructive: 'bg-red-100',
    outline: 'bg-slate-100',
    ghost: 'bg-slate-100',
    link: 'bg-slate-100',
  }
    
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const resolvedIconBg = iconBg ?? defaultIconBg[confirmVariant]

  const setOpen = (value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value)
    }
    onOpenChange?.(value)
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (error) {
      console.error('ConfirmDialog action failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    setOpen(false)
  }

  const handleOpenChange = (value: boolean) => {
    if (isLoading && !value) return
    setOpen(value)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="w-[90vw] max-w-sm rounded-lg sm:w-full"
        onPointerDownOutside={(e) => {
          if (disableCloseOnOverlay || isLoading) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isLoading) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader className='flex items-center mt-4'>
          {icon && (
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${resolvedIconBg} mb-2`}>
              {icon}
            </div>
          )}

          <DialogTitle className='text-lg'>{title}</DialogTitle>
          
          {description && <DialogDescription className='text-center'>{description}</DialogDescription>}
        </DialogHeader>

        <DialogFooter className="flex flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>

          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}