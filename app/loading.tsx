import { Skeleton } from "@/components/ui/skeleton"

interface LoadingSkeletonProps {
  rows?: number
  showSummary?: boolean
  showButton?: boolean
}

export default function PageLoading({
  rows = 4,
  showSummary = true,
  showButton = true,
}: LoadingSkeletonProps) {
  return (
    <div className="w-full max-w-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>

      {/* Rows */}
      <div className="border border-slate-100 rounded-sm px-4 py-2 flex flex-col gap-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-1">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>

      {/* Summary */}
      {showSummary && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="flex justify-between mt-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      )}

      {/* Button */}
      {showButton && <Skeleton className="h-10 w-full rounded-md mt-2" />}
    </div>
  )
}