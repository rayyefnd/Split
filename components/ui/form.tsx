'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { Slot } from '@radix-ui/react-slot'
import {
  Controller,
  ControllerFieldState,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
  UseFormReturn,
} from 'react-hook-form'
import { cn } from '@/lib/utils'

// Context to pass field state down to child components
type FormFieldContextValue = {
  error?: { message?: string }
  name: string
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

export const useFormField = () => {
  const context = React.useContext(FormFieldContext)
  return context
}

const Form = ({
  children,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) => (
  <form noValidate {...props}>
    {children}
  </form>
)

const FormField = <
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  render,
}: {
  control: UseFormReturn<TFieldValues>['control']
  name: TName
  render: (props: {
    field: ControllerRenderProps<TFieldValues, TName>
    fieldState: ControllerFieldState
  }) => React.ReactElement
}) => (
  <Controller
    control={control}
    name={name}
    render={({ field, fieldState }) => (
      <FormFieldContext.Provider
        value={{ error: fieldState.error, name: name as string }}
      >
        {render({ field, fieldState })}
      </FormFieldContext.Provider>
    )}
  />
)

const FormItem = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-2', className)} {...props} />
)

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const fieldContext = useFormField()
  const hasError = !!fieldContext?.error

  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-sm font-medium',
        hasError && 'text-destructive',
        className
      )}
      {...props}
    />
  )
})
FormLabel.displayName = LabelPrimitive.Root.displayName

const FormControl = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ className, ...props }, ref) => {
  const fieldContext = useFormField()
  const hasError = !!fieldContext?.error

  return (
    <Slot
      ref={ref}
      className={cn(
        hasError &&
          'border-destructive ring-destructive focus-visible:ring-destructive',
        className
      )}
      aria-invalid={hasError}
      {...props}
    />
  )
})
FormControl.displayName = 'FormControl'

const FormDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
)

const FormMessage = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => {
  const fieldContext = useFormField()
  const message = children || fieldContext?.error?.message

  if (!message) return null

  return (
    <p className={cn('text-xs text-destructive', className)} {...props}>
      {message}
    </p>
  )
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
}
