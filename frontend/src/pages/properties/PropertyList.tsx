import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PropertiesApi } from "../../api/resources";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";

export function PropertyList() {
  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: () => PropertiesApi.list({ active: "true" }).then((r) => r.data),
  });

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle="Add a property from a client's page — every property belongs to a client"
      />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
              <th>Type</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">Loading…</td>
              </tr>
            )}
            {properties?.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td>
                  <Link to={`/properties/${p.id}`} className="font-medium text-brand-700 hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td>
                  <Link to={`/clients/${p.clientId}`} className="hover:underline">
                    {p.client?.name}
                  </Link>
                </td>
                <td><Badge value={p.type} /></td>
                <td className="text-slate-600">
                  {p.addressLine1}{p.city ? `, ${p.city}` : ""}{p.state ? `, ${p.state}` : ""}
                </td>
              </tr>
            ))}
            {!isLoading && properties?.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">No properties yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
