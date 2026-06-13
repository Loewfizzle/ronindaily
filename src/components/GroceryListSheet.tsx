import BottomSheet from './BottomSheet'
import GroceryListView from './GroceryListView'

interface GroceryListSheetProps {
  open: boolean
  onClose: () => void
}

export default function GroceryListSheet({ open, onClose }: GroceryListSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Grocery List">
      <GroceryListView />
    </BottomSheet>
  )
}
