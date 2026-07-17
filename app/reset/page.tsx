import ResetForm from "@/components/ResetForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set a new password" };

export default function ResetPage({ searchParams }: { searchParams: { token?: string } }) {
  return <ResetForm token={searchParams.token ?? ""} />;
}
