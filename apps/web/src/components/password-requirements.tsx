type Props = {
  password: string;
};

export function PasswordRequirements({ password }: Props) {
  const minLength = password.length >= 8;

  return (
    <ul className="mt-2 space-y-1 text-xs text-muted">
      <li className={minLength ? "text-green" : undefined}>
        {minLength ? "✓" : "○"} At least 8 characters
      </li>
    </ul>
  );
}
