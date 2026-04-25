import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { renameGrid } from '@/api/gifts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from '@/i18n'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  gridId: number
  currentName: string
}

export const RenameAlbumDialog = ({ open, onOpenChange, gridId, currentName }: Props) => {
  const { t } = useTranslation()
  const [name, setName] = useState(currentName)
  const queryClient = useQueryClient()

  // Sync when dialog opens with a different grid
  useEffect(() => {
    if (open) setName(currentName)
  }, [open, currentName])

  const mutation = useMutation({
    mutationFn: () => renameGrid(gridId, name.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grids'] })
      toast(t('toast.albumRenamed'), { description: t('toast.albumRenamedDesc') })
      onOpenChange(false)
    },
    onError: () => {
      toast(t('common.error'), { description: t('toast.errorRenameAlbum') })
    },
  })

  const onSubmit = () => {
    if (!name.trim() || name.trim() === currentName) {
      onOpenChange(false)
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-background/50 backdrop-blur-md rounded-3xl border-border">
        <DialogHeader>
          <DialogTitle>{t('giftDrawer.renameAlbum')}</DialogTitle>
        </DialogHeader>
        <Input
          placeholder={t('dialogs.albumName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
          className="rounded-xl py-5 border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-card/30"
          autoFocus
        />
        <DialogFooter>
          <Button onClick={onSubmit} disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending ? t('dialogs.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
