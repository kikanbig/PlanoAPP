import { useState } from 'react'
import { Group, Rect, Image as KonvaImage, Text } from 'react-konva'
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
  const [isHovered, setIsHovered] = useState(false)
  
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
      
      {/* Hover tooltip */}
      {isHovered && item.product && (
        <Group>
          {/* Tooltip background */}
          <Rect
            x={displayWidth + 5}
            y={-5}
            width={200}
            height={80}
            fill="rgba(0, 0, 0, 0.9)"
            cornerRadius={5}
            listening={false}
            shadowColor="black"
            shadowBlur={5}
            shadowOpacity={0.3}
          />
          
          {/* Tooltip content */}
          <Text
            x={displayWidth + 10}
            y={5}
            text={item.product.name}
            fontSize={12}
            fill="white"
            width={190}
            fontStyle="bold"
            listening={false}
          />
          
          <Text
            x={displayWidth + 10}
            y={25}
            text={`Размер: ${item.product.width}×${item.product.height}×${item.product.depth}мм`}
            fontSize={10}
            fill="#e5e7eb"
            width={190}
            listening={false}
          />
          
          <Text
            x={displayWidth + 10}
            y={40}
            text={`Категория: ${item.product.category}`}
            fontSize={10}
            fill="#e5e7eb"
            width={190}
            listening={false}
          />
          
          {item.product.barcode && (
            <Text
              x={displayWidth + 10}
              y={55}
              text={`Штрихкод: ${item.product.barcode}`}
              fontSize={10}
              fill="#e5e7eb"
              width={190}
              listening={false}
            />
          )}
        </Group>
      )}
    </Group>
  )
} 