import { Plus, Trash2, UserCog, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Field } from '../components/Field.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export function UsersPage({ users, createUser, updateUser, deleteUser, refreshUsers }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshUsers?.();
  }, [refreshUsers]);

  async function onCreate(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setTempPassword('');
    const result = await createUser({ email: email.trim(), displayName: displayName.trim() });
    setLoading(false);
    if (result.ok) {
      setEmail('');
      setDisplayName('');
      setTempPassword(result.temporaryPassword || '');
      setMessage(result.message || 'Usuario criado.');
    } else {
      setMessage(result.message || 'Erro ao criar usuario.');
    }
  }

  return (
    <>
      <PageHeader
        title="Gerenciar Usuarios"
        subtitle="Cadastro manual de clientes (somente admin). Stripe depois."
        icon={UserCog}
      />

      <form className="panel settings-panel" onSubmit={onCreate}>
        <h2>Criar novo cliente</h2>
        <Field label="E-mail" required>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="cliente@email.com"
            required
          />
        </Field>
        <Field label="Nome de exibicao">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Nome do cliente"
          />
        </Field>
        <button className="submit-button settings-save" type="submit" disabled={loading || !email.trim()}>
          <Plus size={18} />
          {loading ? 'Criando...' : 'Criar usuario'}
        </button>
        {message && <div className="message">{message}</div>}
        {tempPassword && (
          <div className="message temp-password-box">
            <strong>Senha temporaria (copie e envie ao cliente):</strong>
            <code>{tempPassword}</code>
          </div>
        )}
      </form>

      <section className="panel block-manager" style={{ marginTop: 18 }}>
        <h2>
          <UserCog size={20} />
          Usuarios cadastrados ({users.length})
        </h2>
        {users.length === 0 ? (
          <div className="empty-mini">Nenhum usuario.</div>
        ) : (
          <div className="blocked-list">
            {users.map((user) => (
              <div className="blocked-row user-row" key={user.id}>
                <div>
                  <strong>
                    {user.displayName || user.username}
                    {user.role === 'owner' || user.isAdmin ? ' · ADMIN' : ''}
                  </strong>
                  <span>
                    {user.email || '—'} · @{user.username} · {user.active === false ? 'inativo' : 'ativo'} ·{' '}
                    {user.createdAt ? new Date(user.createdAt).toLocaleString('pt-BR') : '—'}
                  </span>
                </div>
                {user.role !== 'owner' && !user.isAdmin && (
                  <div className="campaign-actions">
                    <button
                      type="button"
                      className="icon-button"
                      title={user.active === false ? 'Ativar' : 'Desativar'}
                      onClick={() => updateUser(user.id, { active: user.active === false })}
                    >
                      <UserX size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      title="Excluir"
                      onClick={async () => {
                        if (window.confirm(`Excluir ${user.email || user.username}?`)) {
                          await deleteUser(user.id);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
