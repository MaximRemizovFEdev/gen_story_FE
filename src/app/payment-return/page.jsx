import { Suspense } from "react";
import PaymentReturnPage from "../../screens/PaymentReturnPage";

export default function Page() {
  return (
    <Suspense fallback={<main className="auth-page"><p className="auth-status">Проверяем оплату…</p></main>}>
      <PaymentReturnPage />
    </Suspense>
  );
}
