import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { updateBio } from '@/api/user'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from '@/i18n'

type EditBioDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBio?: string
  onBioUpdated?: (bio: string) => void
}

export const EditBioDialog = ({ open, onOpenChange, currentBio = '', onBioUpdated }: EditBioDialogProps) => {
  const { t } = useTranslation()

  const [bio, setBio] = useState('')

  useEffect(() => {
    if (open) {
      setBio(currentBio)
    }
  }, [open, currentBio])

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: updateBio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast(t('toast.bioUpdated'), {
        description: t('toast.bioUpdatedDesc'),
      })
    },
    onError: () => {
      toast(t('common.error'), {
        description: t('toast.errorUpdateBio'),
      })
    },
  })

  const MAX_BIO_LENGTH = 141

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_BIO_LENGTH) {
      setBio(value)
    }
  }

  const onSubmit = () => {
    mutation.mutate(bio, {
      onSuccess: () => {
        onBioUpdated?.(bio)
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-background/50 backdrop-blur-md rounded-3xl border-border">
        <DialogHeader>
          <DialogTitle>{t('profile.editBio')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            placeholder={t('profile.enterBio')}
            value={bio}
            onChange={handleBioChange}
            maxLength={MAX_BIO_LENGTH}
            className="rounded-xl py-5 border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-card/30 min-h-24 break-words overflow-wrap-anywhere overflow-x-hidden"
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          />
          <div className="flex justify-end">
            <span className={`text-xs ${bio.length >= MAX_BIO_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
              {bio.length}/{MAX_BIO_LENGTH}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? t('dialogs.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

