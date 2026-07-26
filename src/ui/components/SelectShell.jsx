import { ChevronDown } from '../icons.jsx';

export function SelectShell({ children, wide }) {
  return (
    <div className={wide ? 'select-shell wide' : 'select-shell'}>
      {children}
      <ChevronDown size={16} />
    </div>
  );
}
