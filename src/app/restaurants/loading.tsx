import LoadingSpinner from '@/components/LoadingSpinner';

export default function RestaurantsPageLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full bg-white/80 backdrop-blur-sm z-50">
      <LoadingSpinner size={50} color="#f97316" />
    </div>
  );
}
