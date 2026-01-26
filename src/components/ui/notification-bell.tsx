import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import { ScrollArea } from './scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success':
      case 'trade_result':
        return 'bg-profit/10 border-profit/30';
      case 'warning':
        return 'bg-warning/10 border-warning/30';
      case 'error':
        return 'bg-loss/10 border-loss/30';
      default:
        return 'bg-secondary border-border';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs flex items-center justify-center text-primary-foreground font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length > 0 ? (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    getTypeStyles(notification.type),
                    !notification.is_read && "ring-1 ring-primary/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No notifications
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
