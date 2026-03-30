import { Surface, MetricCard } from '../../kit.jsx';

function CrmSummarySurface({ summaryPanel }) {
  const { search, setSearch, clients, staff } = summaryPanel;

  return (
    <Surface
      eyebrow="CRM"
      title="People directory"
      description="`CRM` now covers search-ready people lists for assignment workflows, plus v2-native staff creation for managers and admins."
      actions={
        <label className="inline-search">
          <span>Filter people</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or phone" />
        </label>
      }
    >
      <div className="mini-grid">
        <MetricCard label="Clients" value={clients.data.length} detail="Live client records" />
        <MetricCard label="Staff" value={staff.data.length} detail="Employee, manager and admin profiles" tone="accent" />
      </div>
    </Surface>
  );
}

export { CrmSummarySurface };
