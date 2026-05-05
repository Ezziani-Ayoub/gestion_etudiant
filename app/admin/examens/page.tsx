import DashboardLayout from "../../../components/DashboardLayout";

export default function ExamensPage() {
  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh', color: '#6b7280', fontSize: '1.25rem', fontWeight: 500 }}>
        Aucun contrôle ou examen déclaré
      </div>
    </DashboardLayout>
  );
}
