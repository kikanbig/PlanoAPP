import { Group, Rect, Image as KonvaImage } from 'react-konva'
import { ShelfItem } from '../types'

interface PlanogramItemProps {
  item: ShelfItem
  isSelected: boolean
  image?: HTMLImageElement
  onClick: () => void
  onDragEnd: (e: any) => void
}

export default function PlanogramItem({ 
  item, 
  isSelected, 
  image, 
  onClick, 
  onDragEnd 
}: PlanogramItemProps) {
  const strokeColor = isSelected ? '#2563eb' : '#d1d5db'
  const strokeWidth = isSelected ? 2 : 1

  // Используем размеры товара (в пикселях) для всех элементов
  // Фото товара растягивается под эти размеры для точности планограммы
  const displayWidth = item.width
  const displayHeight = item.height

  return (
    <Group
      x={item.x}
      y={item.y}
      draggable
      onClick={onClick}
      onDragEnd={onDragEnd}
    >
      {/* Background rectangle - только для товаров без изображений */}
      {!item.product?.imageUrl && (
        <Rect
          width={displayWidth}
          height={displayHeight}
          fill={item.product?.color || '#e5e7eb'}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )}
      
      {/* Product image if available - растягиваем под размеры товара */}
      {item.product?.imageUrl && image && (
        <>
          {/* Белый фон под изображением */}
          <Rect
            width={displayWidth}
            height={displayHeight}
            fill="#ffffff"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          {/* Само изображение */}
          <KonvaImage
            image={image}
            width={displayWidth}
            height={displayHeight}
            listening={false}
          />
        </>
      )}
    </Group>
  )
} 