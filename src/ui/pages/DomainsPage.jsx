import { Edit3, Globe2, Info, Plus, Shield, ToggleRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Field } from '../components/Field.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export function DomainsPage({ domains, createDomain, updateDomain, deleteDomain }) {
  const [domain, setDomain] = useState('');
  const [domainMessage, setDomainMessage] = useState('');

  async function addDomain(event) {
    event.preventDefault();
    if (!domain.trim()) return;
    const result = await createDomain(domain);
    if (result.ok) {
      setDomain('');
      setDomainMessage('Dominio adicionado.');
    } else {
      setDomainMessage(result.message);
    }
  }

  async function editDomain(item) {
    const nextDomain = window.prompt('Editar dominio', item.domain);
    if (!nextDomain || nextDomain === item.domain) return;
    const result = await updateDomain(item.id, { domain: nextDomain });
    setDomainMessage(result.ok ? 'Dominio atualizado.' : result.message);
  }

  async function removeDomain(item) {
    const confirmed = window.confirm(`Excluir ${item.domain}?`);
    if (!confirmed) return;
    const result = await deleteDomain(item.id);
    setDomainMessage(result.ok ? 'Dominio excluido.' : result.message);
  }

  return (
    <>
      <PageHeader title="Meus Dominios" subtitle="Gerencie seus dominios personalizados para os cloakers" />
      <section className="panel domains-panel">
        <h2>
          <Plus size={22} />
          Adicionar Novo Dominio
        </h2>
        <p>Cadastre um dominio para usar em seus cloakers</p>
        <div className="domain-instructions">
          <Info size={20} />
          <div>
            <strong>Para usar dominio personalizado:</strong>
            <ol>
              <li>
                Aponte o DNS (A/CNAME) do dominio para o host onde o backend MyCloaker esta rodando
              </li>
              <li>Aguarde a propagacao do DNS (5-30 minutos)</li>
              <li>Digite seu dominio aqui e clique em Adicionar</li>
              <li>
                SSL/TLS: configure via Cloudflare, Caddy, Nginx ou reverse proxy (nao e automatico neste app)
              </li>
            </ol>
          </div>
        </div>
        <form className="domain-form" onSubmit={addDomain}>
          <Field label="Dominio">
            <input
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="meudominio.com.br (sem https://)"
            />
          </Field>
          <button className="domain-button" type="submit">
            <Plus size={18} />
            Adicionar Dominio
          </button>
          {domainMessage && <div className="message compact-message">{domainMessage}</div>}
        </form>
      </section>

      <section className="panel domains-panel">
        <h2>
          <Shield size={22} />
          Dominios Globais
        </h2>
        <p>Dominios disponibilizados pelo administrador para todos os usuarios</p>
        <div className="domain-list">
          {domains.global.length ? (
            domains.global.map((item) => (
              <div className="domain-row" key={item.id}>
                <Globe2 size={24} />
                <div>
                  <strong>{item.domain}</strong>
                  <span>Dominio global</span>
                </div>
                <span className={item.active ? 'active-badge' : 'active-badge off'}>
                  {item.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))
          ) : (
            <div className="empty-mini">Nenhum dominio global cadastrado.</div>
          )}
        </div>
      </section>

      <section className="panel domains-panel">
        <h2>
          <Globe2 size={22} />
          Meus Dominios
        </h2>
        <p>{domains.custom.length} dominio(s) cadastrado(s)</p>
        <div className="domain-list">
          {domains.custom.length ? (
            domains.custom.map((item) => (
              <div className="domain-row" key={item.id}>
                <Globe2 size={24} />
                <div>
                  <strong>{item.domain}</strong>
                  <span>Criado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <span className={item.active ? 'active-badge' : 'active-badge off'}>
                  {item.active ? 'Ativo' : 'Inativo'}
                </span>
                <button
                  className="icon-button toggle"
                  aria-label="Alternar dominio"
                  type="button"
                  onClick={() => updateDomain(item.id, { active: !item.active })}
                >
                  <ToggleRight size={32} />
                </button>
                <button className="icon-button" aria-label="Editar dominio" type="button" onClick={() => editDomain(item)}>
                  <Edit3 size={18} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label="Excluir dominio"
                  type="button"
                  onClick={() => removeDomain(item)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-mini">Nenhum dominio personalizado cadastrado.</div>
          )}
        </div>
      </section>
    </>
  );
}
