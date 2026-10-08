export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          <span className="text-2xl font-bold">404</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Trang không tồn tại</h1>
        <p className="mt-2 text-muted-foreground">
          URL bạn truy cập không tồn tại hoặc đã bị di chuyển. Vui lòng quay lại
          trang chủ.
        </p>
      </div>
    </div>
  );
}
