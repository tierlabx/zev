import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'

export default function UserManagement() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card className="rounded-none shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Input 
            placeholder="Search users..." 
            className="w-[300px]"
          />
        </div>
        
        {/* Table Header */}
        <div className="grid grid-cols-4 bg-[#F5F5F5] p-3 px-4 border-b border-border font-medium text-sm text-black">
          <div>User ID</div>
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
        </div>

        {/* Table Rows */}
        <div className="grid grid-cols-4 items-center p-3 px-4 border-b border-border text-sm text-black">
          <div>#1001</div>
          <div>Admin</div>
          <div>admin@zev.com</div>
          <div>Administrator</div>
        </div>
        <div className="grid grid-cols-4 items-center p-3 px-4 border-b border-border text-sm text-black">
          <div>#1002</div>
          <div>John Doe</div>
          <div>john@example.com</div>
          <div>User</div>
        </div>
      </Card>
    </div>
  )
}
