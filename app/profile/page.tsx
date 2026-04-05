import { ProfileScreen } from "@/components/profile/profile-screen";

type ProfilePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function readFirstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default function ProfilePage({ searchParams }: ProfilePageProps) {
  return (
    <ProfileScreen
      googleMessage={readFirstParam(searchParams?.calendar_message)}
      googleProvider={readFirstParam(searchParams?.calendar_provider)}
      googleStatus={readFirstParam(searchParams?.calendar_status)}
    />
  );
}
