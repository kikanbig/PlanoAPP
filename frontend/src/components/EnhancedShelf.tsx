import React, { useRef, useEffect } from 'react'
import { Group, Rect, Text, Transformer, Line } from 'react-konva'
import { ShelfItem, PlanogramSettings } from '../types'

interface EnhancedShelfProps {
  shelf: ShelfItem
  settings: PlanogramSettings
  isSelected?: boolean
  onClick?: () => void
  onDragEnd?: (e: any) => void
  onTransformEnd?: (e: any) => void
}

export default function EnhancedShelf({ 
  shelf, 
  settings, 
  isSelected, 
  onClick, 
  onDragEnd,
  onTransformEnd 
}: EnhancedShelfProps) {
  const shelfRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)
  
  const mmToPixels = (mm: number) => mm * settings.pixelsPerMm
  const pixelsToMm = (pixels: number) => Math.round(pixels / settings.pixelsPerMm)
  
  const shelfDepth = shelf.depth || settings.defaultShelfDepth || 400
  const depthOffset = settings.show3D ? Math.min(mmToPixels(shelfDepth) * 0.15, 20) : 0
  
  // Цвета для разных типов полок
  const shelfColors = {
    standard: '#F3F4F6',
    hook: '#FEF3C7',
    basket: '#E0F2FE',
    divider: '#F0FDF4'
  }
  
  const baseColor = shelfColors[shelf.shelfType || 'standard'] || '#F3F4F6'
  const sideColor = '#D1D5DB'
  const topColor = '#E5E7EB'
  
  useEffect(() => {
    if (isSelected && transformerRef.current && shelfRef.current) {
      transformerRef.current.nodes([shelfRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])
  
  const handleTransformEnd = (e: any) => {
    const node = shelfRef.current
    if (!node) return
    
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    
    // Сбрасываем масштаб и применяем новые размеры
    node.scaleX(1)
    node.scaleY(1)
    
    const newWidth = Math.max(node.width() * scaleX, 50)
    const newHeight = Math.max(node.height() * scaleY, 20)
    
    node.width(newWidth)
    node.height(newHeight)
    
    if (onTransformEnd) {
      onTransformEnd({
        target: node,
        width: newWidth,
        height: newHeight
      })
    }
  }
  
  return (
    <Group>
      <Group
        ref={shelfRef}
        x={shelf.x}
        y={shelf.y}
        width={shelf.width}
        height={shelf.height}
        draggable
        onClick={onClick}
        onDragEnd={onDragEnd}
        onTransformEnd={handleTransformEnd}
      >
        {/* 3D эффект - тень глубины */}
        {settings.show3D && depthOffset > 0 && (
          <>
            <Rect
              x={3}
              y={3}
              width={shelf.width}
              height={shelf.height}
              fill='#000000'
              opacity={0.1}
              cornerRadius={2}
            />
            <Rect
              x={2}
              y={2}
              width={shelf.width}
              height={shelf.height}
              fill='#000000'
              opacity={0.05}
              cornerRadius={2}
            />
          </>
        )}
        
        {/* Основная поверхность полки */}
        <Rect
          x={0}
          y={0}
          width={shelf.width}
          height={shelf.height}
          fill={baseColor}
          stroke={isSelected ? '#3B82F6' : '#9CA3AF'}
          strokeWidth={isSelected ? 2 : 1}
          cornerRadius={2}
        />
        
        {/* Индикатор глубины */}
        {settings.show3D && shelfDepth > 200 && (
          <Rect
            x={shelf.width - 30}
            y={shelf.height - 8}
            width={25}
            height={6}
            fill='#6B7280'
            opacity={0.3}
            cornerRadius={3}
          />
        )}
        
        {/* Паттерн для разных типов полок */}
        {shelf.shelfType === 'hook' && (
          <Group>
            {Array.from({ length: Math.floor(shelf.width / 40) }, (_, i) => (
              <Line
                key={i}
                points={[20 + i * 40, shelf.height - 5, 25 + i * 40, shelf.height - 15, 30 + i * 40, shelf.height - 5]}
                stroke='#92400E'
                strokeWidth={2}
                lineCap='round'
              />
            ))}
          </Group>
        )}
        
        {shelf.shelfType === 'divider' && (
          <Group>
            {Array.from({ length: Math.floor(shelf.width / 100) }, (_, i) => (
              <Line
                key={i}
                points={[50 + i * 100, 0, 50 + i * 100, shelf.height]}
                stroke='#16A34A'
                strokeWidth={1}
                dash={[3, 3]}
              />
            ))}
          </Group>
        )}
        
        {/* Размеры полки */}
        {settings.showDimensions && (
          <Group>
            {/* Ширина */}
            <Text
              x={shelf.width / 2}
              y={shelf.height + 5}
              text={`${pixelsToMm(shelf.width)}мм`}
              fontSize={10}
              fill='#374151'
              align='center'
              width={shelf.width}
            />
            
            {/* Высота */}
            <Text
              x={-25}
              y={shelf.height / 2}
              text={`${pixelsToMm(shelf.height)}мм`}
              fontSize={10}
              fill='#374151'
              rotation={-90}
            />
            
            {/* Глубина */}
            <Text
              x={shelf.width + 10}
              y={shelf.height / 2 - 10}
              text={`↕${shelfDepth}мм`}
              fontSize={10}
              fill='#DC2626'
              fontStyle='bold'
            />
          </Group>
        )}
        
        {/* Тип полки */}
        <Text
          x={5}
          y={5}
          text={shelf.shelfType === 'hook' ? '🪝' : shelf.shelfType === 'basket' ? '🧺' : shelf.shelfType === 'divider' ? '📏' : '📋'}
          fontSize={16}
          fill='#6B7280'
        />
        
        {/* Максимальная нагрузка */}
        {shelf.maxLoad && (
          <Text
            x={shelf.width - 40}
            y={5}
            text={`${shelf.maxLoad}кг`}
            fontSize={9}
            fill='#DC2626'
          />
        )}
      </Group>
      
      {/* Transformer для изменения размеров */}
      {isSelected && shelf.resizable && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Ограничиваем минимальные размеры
            if (newBox.width < 50 || newBox.height < 20) {
              return oldBox
            }
            return newBox
          }}
          keepRatio={false}
          enabledAnchors={[
            'top-left', 'top-right', 'bottom-left', 'bottom-right',
            'top-center', 'bottom-center', 'middle-left', 'middle-right'
          ]}
          rotateEnabled={false}
          borderStroke='#3B82F6'
          borderStrokeWidth={2}
          anchorStroke='#3B82F6'
          anchorFill='white'
          anchorSize={8}
        />
      )}
    </Group>
  )
} 