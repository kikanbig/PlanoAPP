import { useRef, useEffect } from 'react'
import { Group, Rect, Text, Transformer, Line, Circle, Arc } from 'react-konva'
import { ShelfItem, PlanogramSettings } from '../types'

interface EnhancedShelfProps {
  shelf: ShelfItem
  settings: PlanogramSettings
  isSelected?: boolean
  onClick?: () => void
  onDragEnd?: (e: any) => void
  onTransformEnd?: (e: any) => void
  onDistributeProducts?: (shelfId: string) => void
}

export default function EnhancedShelf({ 
  shelf, 
  settings, 
  isSelected, 
  onClick, 
  onDragEnd,
  onTransformEnd,
  onDistributeProducts 
}: EnhancedShelfProps) {
  const shelfRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)
  
  const mmToPixels = (mm: number) => mm * settings.pixelsPerMm
  const pixelsToMm = (pixels: number) => Math.round(pixels / settings.pixelsPerMm)
  
  const shelfDepth = shelf.depth || settings.defaultShelfDepth || 400
  const depthOffset = settings.show3D ? Math.min(mmToPixels(shelfDepth) * 0.15, 20) : 0
  
  // Цвета и стили для разных типов полок
  const shelfStyles = {
    standard: { 
      fill: '#F8FAFC', 
      stroke: '#E2E8F0', 
      accent: '#64748B' 
    },
    hook: { 
      fill: '#FEF9C3', 
      stroke: '#F59E0B', 
      accent: '#D97706' 
    },
    basket: { 
      fill: '#E0F7FA', 
      stroke: '#0891B2', 
      accent: '#0369A1' 
    },
    divider: { 
      fill: '#F0FDF4', 
      stroke: '#16A34A', 
      accent: '#15803D' 
    },
    slanted: { 
      fill: '#FDF4FF', 
      stroke: '#A855F7', 
      accent: '#7C3AED' 
    },
    wire: { 
      fill: '#F1F5F9', 
      stroke: '#475569', 
      accent: '#334155' 
    },
    bottle: { 
      fill: '#FEF2F2', 
      stroke: '#EF4444', 
      accent: '#DC2626' 
    },
    pegboard: { 
      fill: '#FFFBEB', 
      stroke: '#F59E0B', 
      accent: '#D97706' 
    }
  }
  
  const style = shelfStyles[shelf.shelfType || 'standard']

  useEffect(() => {
    if (isSelected && transformerRef.current && shelfRef.current) {
      transformerRef.current.nodes([shelfRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])
  
  const handleTransformEnd = () => {
    const node = shelfRef.current
    if (!node) return
    
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    
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

  // Обработчик клика по кнопке распределения товаров
  const handleDistributeClick = (e: any) => {
    e.cancelBubble = true // Предотвращаем всплытие события
    if (onDistributeProducts) {
      onDistributeProducts(shelf.id)
    }
  }

  // Рендер разных типов полок
  const renderShelfPattern = () => {
    const type = shelf.shelfType || 'standard'
    
    switch (type) {
      case 'hook':
        // Крючки для одежды
        return (
          <Group>
            {Array.from({ length: Math.floor(shelf.width / 60) }, (_, i) => (
              <Group key={i}>
                <Circle
                  x={30 + i * 60}
                  y={shelf.height - 8}
                  radius={3}
                  fill={style.accent}
                />
                <Arc
                  x={30 + i * 60}
                  y={shelf.height - 8}
                  innerRadius={3}
                  outerRadius={8}
                  angle={180}
                  rotation={180}
                  stroke={style.accent}
                  strokeWidth={2}
                />
              </Group>
            ))}
            <Text
              x={5}
              y={5}
              text="👔"
              fontSize={14}
            />
          </Group>
        )
      
      case 'basket':
        // Сетчатая корзина
        return (
          <Group>
            {/* Сетка */}
            {Array.from({ length: Math.floor(shelf.width / 15) }, (_, i) => (
              <Line
                key={`v-${i}`}
                points={[i * 15, 5, i * 15, shelf.height - 5]}
                stroke={style.accent}
                strokeWidth={0.5}
                opacity={0.7}
              />
            ))}
            {Array.from({ length: Math.floor(shelf.height / 15) }, (_, i) => (
              <Line
                key={`h-${i}`}
                points={[5, i * 15, shelf.width - 5, i * 15]}
                stroke={style.accent}
                strokeWidth={0.5}
                opacity={0.7}
              />
            ))}
            <Text
              x={5}
              y={5}
              text="🧺"
              fontSize={14}
            />
          </Group>
        )
      
      case 'divider':
        // Полка с разделителями
        return (
          <Group>
            {Array.from({ length: Math.floor(shelf.width / 80) }, (_, i) => (
              <Rect
                key={i}
                x={40 + i * 80}
                y={0}
                width={2}
                height={shelf.height}
                fill={style.accent}
                opacity={0.8}
              />
            ))}
            <Text
              x={5}
              y={5}
              text="📋"
              fontSize={14}
            />
          </Group>
        )
      
      case 'slanted':
        // Улучшенная наклонная полка
        return (
          <Group>
            {/* Основная наклонная поверхность с градиентом */}
            <Line
              points={[0, shelf.height, shelf.width, shelf.height * 0.7]}
              stroke={style.accent}
              strokeWidth={3}
              lineCap='round'
            />
            
            {/* Толщина полки для 3D эффекта */}
            <Line
              points={[0, shelf.height - 2, shelf.width, shelf.height * 0.7 - 2]}
              stroke={style.fill}
              strokeWidth={2}
              lineCap='round'
              opacity={0.8}
            />
            
            {/* Задняя подпорка */}
            <Line
              points={[shelf.width, shelf.height * 0.7, shelf.width, 0]}
              stroke={style.accent}
              strokeWidth={2}
              opacity={0.6}
            />
            
            {/* Поддерживающие кронштейны */}
            {Array.from({ length: Math.max(2, Math.floor(shelf.width / 150)) }, (_, i) => {
              const x = (shelf.width * (i + 1)) / (Math.max(2, Math.floor(shelf.width / 150)) + 1)
              const topY = shelf.height * 0.7 + (x / shelf.width) * (shelf.height - shelf.height * 0.7)
              return (
                <Group key={i}>
                  {/* Вертикальная опора */}
                  <Line
                    points={[x, topY, x, 0]}
                    stroke={style.accent}
                    strokeWidth={1.5}
                    opacity={0.7}
                  />
                  {/* Угловая поддержка */}
                  <Line
                    points={[x - 15, topY + 10, x, topY, x + 15, topY + 10]}
                    stroke={style.accent}
                    strokeWidth={1}
                    opacity={0.5}
                  />
                </Group>
              )
            })}
            
            {/* Передний бортик */}
            <Line
              points={[0, shelf.height, 0, shelf.height - 8]}
              stroke={style.accent}
              strokeWidth={2}
              lineCap='round'
            />
            
            <Text
              x={5}
              y={5}
              text="📐"
              fontSize={14}
            />
          </Group>
        )
      
      case 'wire':
        // Проволочная полка
        return (
          <Group>
            {/* Проволочные прутья */}
            {Array.from({ length: Math.floor(shelf.width / 20) }, (_, i) => (
              <Circle
                key={i}
                x={10 + i * 20}
                y={shelf.height / 2}
                radius={1}
                fill={style.accent}
              />
            ))}
            {/* Соединяющие линии */}
            <Line
              points={[5, shelf.height / 2, shelf.width - 5, shelf.height / 2]}
              stroke={style.accent}
              strokeWidth={2}
            />
            <Line
              points={[5, shelf.height - 5, shelf.width - 5, shelf.height - 5]}
              stroke={style.accent}
              strokeWidth={2}
            />
            <Text
              x={5}
              y={5}
              text="🔗"
              fontSize={14}
            />
          </Group>
        )
      
      case 'bottle':
        // Полка для бутылок с выемками
        return (
          <Group>
            {Array.from({ length: Math.floor(shelf.width / 50) }, (_, i) => (
              <Arc
                key={i}
                x={25 + i * 50}
                y={shelf.height - 5}
                innerRadius={8}
                outerRadius={12}
                angle={180}
                rotation={0}
                stroke={style.accent}
                strokeWidth={2}
                fill={style.fill}
              />
            ))}
            <Text
              x={5}
              y={5}
              text="🍾"
              fontSize={14}
            />
          </Group>
        )
      
      case 'pegboard':
        // Перфорированная доска
        return (
          <Group>
            {Array.from({ length: Math.floor(shelf.width / 25) }, (_, i) => 
              Array.from({ length: Math.floor(shelf.height / 25) }, (_, j) => (
                <Circle
                  key={`${i}-${j}`}
                  x={12.5 + i * 25}
                  y={12.5 + j * 25}
                  radius={2}
                  fill={style.accent}
                  opacity={0.6}
                />
              ))
            ).flat()}
            <Text
              x={5}
              y={5}
              text="🔩"
              fontSize={14}
            />
          </Group>
        )
      
      default:
        // Стандартная полка
        return (
          <Group>
            <Text
              x={5}
              y={5}
              text="📋"
              fontSize={14}
            />
          </Group>
        )
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
              x={4}
              y={4}
              width={shelf.width}
              height={shelf.height}
              fill='#000000'
              opacity={0.15}
              cornerRadius={3}
            />
            <Rect
              x={2}
              y={2}
              width={shelf.width}
              height={shelf.height}
              fill='#000000'
              opacity={0.08}
              cornerRadius={3}
            />
          </>
        )}
        
        {/* Основная поверхность полки */}
        <Rect
          x={0}
          y={0}
          width={shelf.width}
          height={shelf.height}
          fill={style.fill}
          stroke={isSelected ? '#3B82F6' : style.stroke}
          strokeWidth={isSelected ? 3 : 1.5}
          cornerRadius={3}
        />
        
        {/* Кнопка равномерного распределения товаров */}
        {onDistributeProducts && (
          <Group
            onClick={handleDistributeClick}
            onTap={handleDistributeClick}
          >
            {/* Фон кнопки */}
            <Rect
              x={shelf.width - 28}
              y={2}
              width={26}
              height={20}
              fill='#3B82F6'
              cornerRadius={3}
              opacity={0.9}
            />
            {/* Иконка распределения (три линии с точками) */}
            <Group>
              {/* Верхняя линия */}
              <Line
                points={[shelf.width - 24, 8, shelf.width - 8, 8]}
                stroke='white'
                strokeWidth={1}
              />
              <Circle
                x={shelf.width - 22}
                y={8}
                radius={1}
                fill='white'
              />
              <Circle
                x={shelf.width - 16}
                y={8}
                radius={1}
                fill='white'
              />
              <Circle
                x={shelf.width - 10}
                y={8}
                radius={1}
                fill='white'
              />
              
              {/* Средняя линия */}
              <Line
                points={[shelf.width - 24, 12, shelf.width - 8, 12]}
                stroke='white'
                strokeWidth={1}
              />
              <Circle
                x={shelf.width - 22}
                y={12}
                radius={1}
                fill='white'
              />
              <Circle
                x={shelf.width - 16}
                y={12}
                radius={1}
                fill='white'
              />
              <Circle
                x={shelf.width - 10}
                y={12}
                radius={1}
                fill='white'
              />
              
              {/* Нижняя линия */}
              <Line
                points={[shelf.width - 24, 16, shelf.width - 8, 16]}
                stroke='white'
                strokeWidth={1}
              />
              <Circle
                x={shelf.width - 22}
                y={16}
                radius={1}
                fill='white'
              />
              <Circle
                x={shelf.width - 16}
                y={16}
                radius={1}
                fill='white'
              />
              <Circle
                x={shelf.width - 10}
                y={16}
                radius={1}
                fill='white'
              />
            </Group>
          </Group>
        )}
        
        {/* Индикатор глубины */}
        {settings.show3D && shelfDepth > 200 && (
          <Rect
            x={shelf.width - 35}
            y={shelf.height - 10}
            width={30}
            height={8}
            fill={style.accent}
            opacity={0.4}
            cornerRadius={4}
          />
        )}
        
        {/* Паттерн для типа полки */}
        {renderShelfPattern()}
        
        {/* Размеры полки */}
        {settings.showDimensions && (
          <Group>
            {/* Ширина */}
            <Text
              x={shelf.width / 2}
              y={shelf.height + 8}
              text={`${pixelsToMm(shelf.width)}мм`}
              fontSize={10}
              fill='#374151'
              align='center'
              width={shelf.width}
              fontStyle='bold'
            />
            
            {/* Высота */}
            <Text
              x={-30}
              y={shelf.height / 2}
              text={`${pixelsToMm(shelf.height)}мм`}
              fontSize={10}
              fill='#374151'
              rotation={-90}
              fontStyle='bold'
            />
            
            {/* Глубина */}
            <Text
              x={shelf.width + 12}
              y={shelf.height / 2 - 5}
              text={`↕${shelfDepth}мм`}
              fontSize={10}
              fill={style.accent}
              fontStyle='bold'
            />
          </Group>
        )}
        
        {/* Название типа полки */}
        <Text
          x={shelf.width - 5}
          y={shelf.height - 15}
          text={shelf.shelfType || 'standard'}
          fontSize={8}
          fill={style.accent}
          align='right'
          width={80}
          fontStyle='bold'
          opacity={0.8}
        />
      </Group>
      
      {/* Transformer для изменения размера */}
      {isSelected && shelf.resizable && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          borderStroke='#3B82F6'
          borderStrokeWidth={2}
          anchorStroke='#3B82F6'
          anchorStrokeWidth={2}
          anchorSize={8}
          anchorCornerRadius={2}
        />
      )}
    </Group>
  )
} 