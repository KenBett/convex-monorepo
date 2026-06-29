import { Alert } from "@heroui/react";

interface ExploreStatusAlertProps {
  message: string;
}

export function ExploreStatusAlert({ message }: ExploreStatusAlertProps) {
  return (
    <Alert
      className="motion-safe-fade-in rounded-card shadow-sm dark:shadow-none"
      role="status"
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title className="text-sm font-normal">{message}</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}
