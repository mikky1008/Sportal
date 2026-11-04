import { scholarships } from "@/data/mock";
import { PageHeader } from "@/components/common";
import { ScholarshipCard } from "@/components/listings";
import { Page } from "@/components/Page";

export default function ScholarshipsPage() {
  return (
    <Page title="Scholarships">
      <PageHeader title="Scholarships" subtitle="Apply with your showcase profile. Universities decide who receives each scholarship." />
      <div className="grid gap-4 md:grid-cols-2">{scholarships.map((s) => <ScholarshipCard key={s.id} s={s} />)}</div>
    </Page>
  );
}
