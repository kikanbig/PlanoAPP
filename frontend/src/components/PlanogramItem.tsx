import { Group, Rect, Text, Image as KonvaImage } from 'react-konva'
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
      
      {/* Semi-transparent overlay for text readability when image is present */}
      {item.product?.imageUrl && (
        <Rect
          width={displayWidth}
          height={Math.min(20, displayHeight)}
          y={displayHeight - Math.min(20, displayHeight)}
          fill="rgba(0, 0, 0, 0.8)"
          listening={false}
        />
      )}
      
      {/* Product name text */}
      <Text
        text={item.product?.name || 'Полка'}
        fontSize={Math.min(10, displayWidth / 10)}
        fill={item.product?.imageUrl ? '#ffffff' : '#374151'}
        width={displayWidth}
        height={item.product?.imageUrl ? Math.min(20, displayHeight) : displayHeight}
        y={item.product?.imageUrl ? displayHeight - Math.min(20, displayHeight) : 0}
        align="center"
        verticalAlign="middle"
        listening={false}
        fontFamily="Arial, sans-serif"
        fontStyle="bold"
      />
    </Group>
  )
} 