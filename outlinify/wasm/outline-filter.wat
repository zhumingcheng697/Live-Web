(module
 (type $i32_i32_i32_i32_i32_i32_i32_=>_none (func (param i32 i32 i32 i32 i32 i32 i32)))
 (type $i32_i32_i32_i32_i32_=>_none (func (param i32 i32 i32 i32 i32)))
 (import "env" "memory" (memory $0 0))
 (export "outlineFilter" (func $outline-filter/outlineFilter))
 (export "memory" (memory $0))
 (func $outline-filter/calculateColor (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32) (param $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  (local $12 i32)
  local.get $4
  i32.const 2
  i32.and
  i32.eqz
  i32.eqz
  local.set $12
  local.get $5
  i32.load8_u offset=1
  local.set $7
  local.get $5
  i32.load8_u offset=2
  local.set $8
  local.get $0
  local.get $1
  local.get $2
  i32.mul
  i32.add
  i32.const 2
  i32.shl
  local.tee $0
  i32.load8_u
  local.set $9
  local.get $0
  i32.load8_u offset=1
  local.set $10
  local.get $0
  i32.load8_u offset=2
  local.set $11
  local.get $2
  local.get $3
  i32.mul
  i32.const 2
  i32.shl
  local.get $5
  i32.add
  local.tee $3
  i32.load8_u
  local.set $0
  local.get $3
  i32.load8_u offset=1
  local.set $1
  local.get $3
  i32.load8_u offset=2
  local.set $2
  local.get $4
  i32.const 1
  i32.and
  i32.const 1
  local.get $4
  i32.const 255
  i32.and
  select
  local.tee $4
  i32.const 0
  local.get $9
  local.get $5
  i32.load8_u
  local.tee $5
  i32.gt_u
  local.get $9
  local.get $5
  i32.sub
  i32.const 255
  i32.and
  local.get $6
  i32.const 255
  i32.and
  i32.gt_u
  i32.and
  select
  if
   local.get $0
   local.get $0
   i32.const 32
   local.get $0
   i32.const 255
   i32.and
   i32.const 32
   i32.lt_u
   select
   i32.sub
   local.set $0
  else
   local.get $5
   local.get $9
   i32.gt_u
   local.get $5
   local.get $9
   i32.sub
   i32.const 255
   i32.and
   local.get $6
   i32.const 255
   i32.and
   i32.gt_u
   i32.and
   local.get $12
   i32.and
   if
    local.get $2
    local.get $2
    i32.const 16
    local.get $2
    i32.const 255
    i32.and
    i32.const 16
    i32.lt_u
    select
    i32.sub
    local.set $2
    local.get $1
    local.get $1
    i32.const 16
    local.get $1
    i32.const 255
    i32.and
    i32.const 16
    i32.lt_u
    select
    i32.sub
    local.set $1
   end
  end
  local.get $4
  i32.const 0
  local.get $7
  local.get $10
  i32.lt_u
  local.get $10
  local.get $7
  i32.sub
  i32.const 255
  i32.and
  local.get $6
  i32.const 255
  i32.and
  i32.gt_u
  i32.and
  select
  if
   local.get $1
   local.get $1
   i32.const 32
   local.get $1
   i32.const 255
   i32.and
   i32.const 32
   i32.lt_u
   select
   i32.sub
   local.set $1
  else
   local.get $7
   local.get $10
   i32.sub
   i32.const 255
   i32.and
   local.get $6
   i32.const 255
   i32.and
   i32.gt_u
   local.get $7
   local.get $10
   i32.gt_u
   i32.and
   local.get $12
   i32.and
   if
    local.get $2
    local.get $2
    i32.const 16
    local.get $2
    i32.const 255
    i32.and
    i32.const 16
    i32.lt_u
    select
    i32.sub
    local.set $2
    local.get $0
    local.get $0
    i32.const 16
    local.get $0
    i32.const 255
    i32.and
    i32.const 16
    i32.lt_u
    select
    i32.sub
    local.set $0
   end
  end
  local.get $4
  i32.const 0
  local.get $8
  local.get $11
  i32.lt_u
  local.get $11
  local.get $8
  i32.sub
  i32.const 255
  i32.and
  local.get $6
  i32.const 255
  i32.and
  i32.gt_u
  i32.and
  select
  if
   local.get $2
   local.get $2
   i32.const 32
   local.get $2
   i32.const 255
   i32.and
   i32.const 32
   i32.lt_u
   select
   i32.sub
   local.set $2
  else
   local.get $8
   local.get $11
   i32.sub
   i32.const 255
   i32.and
   local.get $6
   i32.const 255
   i32.and
   i32.gt_u
   local.get $8
   local.get $11
   i32.gt_u
   i32.and
   local.get $12
   i32.and
   if
    local.get $1
    local.get $1
    i32.const 16
    local.get $1
    i32.const 255
    i32.and
    i32.const 16
    i32.lt_u
    select
    i32.sub
    local.set $1
    local.get $0
    local.get $0
    i32.const 16
    local.get $0
    i32.const 255
    i32.and
    i32.const 16
    i32.lt_u
    select
    i32.sub
    local.set $0
   end
  end
  local.get $3
  local.get $0
  i32.store8
  local.get $3
  local.get $1
  i32.store8 offset=1
  local.get $3
  local.get $2
  i32.store8 offset=2
 )
 (func $outline-filter/outlineFilter (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  loop $for-loop|0
   local.get $2
   local.get $3
   i32.mul
   i32.const 2
   i32.shl
   local.get $5
   i32.gt_u
   if
    local.get $2
    local.get $3
    i32.mul
    i32.const 2
    i32.shl
    local.get $5
    i32.add
    i32.const 255
    i32.store8
    local.get $5
    i32.const 1
    i32.add
    local.set $5
    br $for-loop|0
   end
  end
  i32.const 0
  local.set $5
  loop $for-loop|1
   local.get $2
   local.get $5
   i32.gt_u
   if
    i32.const 0
    local.set $6
    loop $for-loop|2
     local.get $3
     local.get $6
     i32.gt_u
     if
      local.get $5
      local.get $1
      i32.sub
      i32.const 0
      local.get $1
      local.get $5
      i32.lt_u
      select
      local.tee $9
      local.get $6
      local.get $1
      i32.sub
      i32.const 0
      local.get $1
      local.get $6
      i32.lt_u
      select
      local.tee $10
      local.get $2
      local.get $3
      local.get $4
      local.get $5
      local.get $2
      local.get $6
      i32.mul
      i32.add
      i32.const 2
      i32.shl
      local.tee $7
      local.get $0
      call $outline-filter/calculateColor
      local.get $5
      local.get $10
      local.get $2
      local.get $3
      local.get $4
      local.get $7
      local.get $0
      call $outline-filter/calculateColor
      local.get $1
      local.get $5
      i32.add
      local.tee $11
      local.get $2
      i32.const 1
      i32.sub
      local.tee $8
      local.get $8
      local.get $11
      i32.gt_u
      select
      local.tee $8
      local.get $10
      local.get $2
      local.get $3
      local.get $4
      local.get $7
      local.get $0
      call $outline-filter/calculateColor
      local.get $9
      local.get $6
      local.get $2
      local.get $3
      local.get $4
      local.get $7
      local.get $0
      call $outline-filter/calculateColor
      local.get $8
      local.get $6
      local.get $2
      local.get $3
      local.get $4
      local.get $7
      local.get $0
      call $outline-filter/calculateColor
      local.get $9
      local.get $1
      local.get $6
      i32.add
      local.tee $9
      local.get $3
      i32.const 1
      i32.sub
      local.tee $10
      local.get $9
      local.get $10
      i32.lt_u
      select
      local.tee $9
      local.get $2
      local.get $3
      local.get $4
      local.get $7
      local.get $0
      call $outline-filter/calculateColor
      local.get $5
      local.get $9
      local.get $2
      local.get $3
      local.get $4
      local.get $7
      local.get $0
      call $outline-filter/calculateColor
      local.get $8
      local.get $9
      local.get $2
      local.get $3
      local.get $4
      local.get $7
      local.get $0
      call $outline-filter/calculateColor
      local.get $6
      i32.const 1
      i32.add
      local.set $6
      br $for-loop|2
     end
    end
    local.get $5
    i32.const 1
    i32.add
    local.set $5
    br $for-loop|1
   end
  end
 )
)
