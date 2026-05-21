import { requirePermission } from "@/modules/access/server/authorization";
import { UserManager } from "@/modules/access/ui/user-manager";

export default async function UsuariosPage() {
  const actor = await requirePermission("billing.manage");

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mb-2 block">
          ADMINISTRAÇÃO
        </span>
        <h1 className="text-3xl font-display font-bold text-blue-900 mb-2">
          Usuários
        </h1>
        <p className="text-ink-500 font-body text-sm max-w-2xl">
          Gerencie os usuários com acesso ao sistema, seus perfis e permissões.
        </p>
      </div>

      <UserManager currentUserId={actor.userId} />
    </div>
  );
}
