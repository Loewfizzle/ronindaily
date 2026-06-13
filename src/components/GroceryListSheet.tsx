import FullSheet from './FullSheet'
import GroceryListView from './GroceryListView'

interface GroceryListSheetProps {
  open: boolean
  onClose: () => void
}

export default function GroceryListSheet({ open, onClose }: GroceryListSheetProps) {
  return (
    <FullSheet open={open} onClose={onClose} title="Grocery List">
      <GroceryListView />
    </FullSheet>
  )
}
