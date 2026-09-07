import LoadingSpinner from '@/lib/api/LoadingSpinner';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-white/80 backdrop-blur-sm z-50">
      <LoadingSpinner size={50} color="#f97316" />
    </div>
  );
}
