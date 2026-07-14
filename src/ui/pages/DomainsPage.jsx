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
      setDomainMessage('Dominio salvo. Agora ele aparece ao criar campanha.');
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
      <PageHeader
        title="Meus Dominios"
        subtitle="Escolha o nome do site que aparece no link do cloaker (ex: cloaker.lol/r/oferta)"
      />

      <section className="panel domains-panel">
        <h2>
          <Info size={20} />
          Como funciona (simples)
        </h2>
        <div className="domain-instructions leigo">
          <ol>
            <li>
              <strong>Opção mais fácil:</strong> use o dominio global <code>cloaker.lol</code> na campanha. Nada extra
              pra configurar.
            </li>
            <li>
              <strong>Dominio seu:</strong> se quiser <code>meusite.com/r/oferta</code>, primeiro o dominio precisa
              apontar pro mesmo servidor do cloaker (DNS no lugar onde comprou o dominio / Cloudflare). Isso e feito
              fora deste painel.
            </li>
            <li>
              Depois que o dominio ja abre o painel/cloaker no navegador, cadastre o nome aqui so para aparecer no
              select da campanha e gerar o link completo.
            </li>
            <li>
              <strong>HTTPS (cadeado):</strong> configure no EasyPanel/Cloudflare — o app nao gera certificado sozinho.
            </li>
          </ol>
          <p className="domain-soft-note">
            Cadastrar aqui <strong>nao</strong> cria o site na internet sozinho. So organiza o nome do link no seu
            cloaker.
          </p>
        </div>
      </section>

      <section className="panel domains-panel">
        <h2>
          <Plus size={20} />
          Adicionar meu dominio
        </h2>
        <p>Digite so o nome, sem https:// — ex: go.meusite.com</p>
        <form className="domain-form" onSubmit={addDomain}>
          <Field label="Dominio">
            <input
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="go.meusite.com"
            />
          </Field>
          <button className="domain-button" type="submit">
            <Plus size={18} />
            Salvar dominio
          </button>
          {domainMessage && <div className="message compact-message">{domainMessage}</div>}
        </form>
      </section>

      <section className="panel domains-panel">
        <h2>
          <Shield size={20} />
          Dominios prontos (da plataforma)
        </h2>
        <p>Ja funcionam no cloaker — use na campanha se nao tiver dominio proprio.</p>
        <div className="domain-list">
          {domains.global.length ? (
            domains.global.map((item) => (
              <div className="domain-row" key={item.id}>
                <Globe2 size={22} />
                <div>
                  <strong>{item.domain}</strong>
                  <span>Pronto para usar no link /r/...</span>
                </div>
                <span className={item.active ? 'active-badge' : 'active-badge off'}>
                  {item.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))
          ) : (
            <div className="empty-mini">Nenhum dominio global. Use o host atual do painel ao criar campanha.</div>
          )}
        </div>
      </section>

      <section className="panel domains-panel">
        <h2>
          <Globe2 size={20} />
          Dominios que voce cadastrou
        </h2>
        <p>{domains.custom.length} dominio(s)</p>
        <div className="domain-list">
          {domains.custom.length ? (
            domains.custom.map((item) => (
              <div className="domain-row" key={item.id}>
                <Globe2 size={22} />
                <div>
                  <strong>{item.domain}</strong>
                  <span>Salvo em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
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
                  <ToggleRight size={28} />
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
            <div className="empty-mini">
              Voce ainda nao cadastrou dominio extra. Pode usar so o dominio da plataforma nas campanhas.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
