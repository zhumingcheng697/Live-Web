(module
 (type $i32_i32_i32_i32_i32_=>_none (func (param i32 i32 i32 i32 i32)))
 (import "env" "memory" (memory $0 0))
 (export "outlineFilter" (func $outline-filter/outlineFilter))
 (export "memory" (memory $0))
 (func $outline-filter/outlineFilter (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  (local $12 i32)
  (local $13 i32)
  (local $14 i32)
  (local $15 i32)
  (local $16 i32)
  (local $17 i32)
  (local $18 i32)
  (local $19 i32)
  (local $20 i32)
  (local $21 i32)
  (local $22 i32)
  (local $23 i32)
  (local $24 i32)
  (local $25 i32)
  (local $26 i32)
  local.get $4
  i32.const 1
  i32.and
  i32.const 1
  local.get $4
  select
  local.set $21
  local.get $4
  i32.const 2
  i32.and
  i32.eqz
  i32.eqz
  local.set $22
  local.get $2
  local.get $3
  i32.mul
  i32.const 2
  i32.shl
  local.set $18
  loop $for-loop|0
   local.get $7
   local.get $18
   i32.lt_u
   if
    local.get $7
    local.get $18
    i32.add
    i32.const 255
    i32.store8
    local.get $7
    i32.const 1
    i32.add
    local.set $7
    br $for-loop|0
   end
  end
  i32.const 0
  local.set $7
  loop $for-loop|1
   local.get $2
   local.get $7
   i32.gt_u
   if
    i32.const 0
    local.set $8
    loop $for-loop|2
     local.get $3
     local.get $8
     i32.gt_u
     if
      local.get $2
      local.get $8
      i32.mul
      local.get $7
      i32.add
      i32.const 2
      i32.shl
      local.tee $4
      local.get $18
      i32.add
      local.set $9
      local.get $4
      i32.load8_u
      local.set $12
      local.get $4
      i32.load8_u offset=1
      local.set $13
      local.get $4
      i32.load8_u offset=2
      local.set $14
      local.get $7
      local.get $1
      i32.sub
      i32.const 0
      local.get $1
      local.get $7
      i32.lt_u
      select
      local.set $23
      local.get $1
      local.get $7
      i32.add
      local.tee $4
      local.get $2
      i32.const 1
      i32.sub
      local.tee $5
      local.get $4
      local.get $5
      i32.lt_u
      select
      local.set $24
      local.get $8
      local.get $1
      i32.sub
      i32.const 0
      local.get $1
      local.get $8
      i32.lt_u
      select
      local.set $25
      local.get $1
      local.get $8
      i32.add
      local.tee $4
      local.get $3
      i32.const 1
      i32.sub
      local.tee $5
      local.get $4
      local.get $5
      i32.lt_u
      select
      local.set $26
      i32.const 0
      local.set $10
      loop $for-loop|3
       local.get $10
       i32.const 3
       i32.lt_u
       if
        local.get $24
        local.get $7
        local.get $10
        i32.const 2
        i32.eq
        select
        local.get $23
        local.get $10
        select
        local.set $19
        i32.const 0
        local.set $11
        loop $for-loop|4
         local.get $11
         i32.const 3
         i32.lt_u
         if
          block $for-continue|4
           local.get $11
           if (result i32)
            local.get $11
            i32.const 2
            i32.eq
            if (result i32)
             local.get $26
            else
             local.get $7
             local.get $19
             i32.eq
             br_if $for-continue|4
             local.get $8
            end
           else
            local.get $25
           end
           local.get $2
           i32.mul
           local.get $19
           i32.add
           i32.const 2
           i32.shl
           local.tee $4
           i32.load8_u
           local.set $15
           local.get $4
           i32.load8_u offset=1
           local.set $16
           local.get $4
           i32.load8_u offset=2
           local.set $17
           local.get $9
           i32.load8_u
           local.set $4
           local.get $9
           i32.load8_u offset=1
           local.set $5
           local.get $9
           i32.load8_u offset=2
           local.set $6
           local.get $21
           if
            local.get $4
            local.get $4
            i32.const 32
            local.get $4
            i32.const 255
            i32.and
            i32.const 32
            i32.lt_u
            select
            i32.sub
            local.get $4
            local.get $12
            local.get $15
            i32.lt_u
            local.get $0
            i32.const 255
            i32.and
            local.tee $20
            local.get $15
            local.get $12
            i32.sub
            i32.const 255
            i32.and
            i32.lt_u
            i32.and
            select
            local.set $4
            local.get $6
            local.get $6
            i32.const 32
            local.get $6
            i32.const 255
            i32.and
            i32.const 32
            i32.lt_u
            select
            i32.sub
            local.get $6
            local.get $14
            local.get $17
            i32.lt_u
            local.get $17
            local.get $14
            i32.sub
            i32.const 255
            i32.and
            local.get $20
            i32.gt_u
            i32.and
            select
            local.set $6
            local.get $5
            local.get $5
            i32.const 32
            local.get $5
            i32.const 255
            i32.and
            i32.const 32
            i32.lt_u
            select
            i32.sub
            local.get $5
            local.get $13
            local.get $16
            i32.lt_u
            local.get $16
            local.get $13
            i32.sub
            i32.const 255
            i32.and
            local.get $20
            i32.gt_u
            i32.and
            select
            local.set $5
           end
           local.get $9
           local.get $22
           if (result i32)
            local.get $12
            local.get $15
            i32.gt_u
            local.get $12
            local.get $15
            i32.sub
            i32.const 255
            i32.and
            local.get $0
            i32.const 255
            i32.and
            i32.gt_u
            i32.and
            if
             local.get $6
             local.get $6
             i32.const 16
             local.get $6
             i32.const 255
             i32.and
             i32.const 16
             i32.lt_u
             select
             i32.sub
             local.set $6
             local.get $5
             local.get $5
             i32.const 16
             local.get $5
             i32.const 255
             i32.and
             i32.const 16
             i32.lt_u
             select
             i32.sub
             local.set $5
            end
            local.get $13
            local.get $16
            i32.sub
            i32.const 255
            i32.and
            local.get $0
            i32.const 255
            i32.and
            i32.gt_u
            local.get $13
            local.get $16
            i32.gt_u
            i32.and
            if
             local.get $6
             local.get $6
             i32.const 16
             local.get $6
             i32.const 255
             i32.and
             i32.const 16
             i32.lt_u
             select
             i32.sub
             local.set $6
             local.get $4
             local.get $4
             i32.const 16
             local.get $4
             i32.const 255
             i32.and
             i32.const 16
             i32.lt_u
             select
             i32.sub
             local.set $4
            end
            local.get $14
            local.get $17
            i32.sub
            i32.const 255
            i32.and
            local.get $0
            i32.const 255
            i32.and
            i32.gt_u
            local.get $14
            local.get $17
            i32.gt_u
            i32.and
            if (result i32)
             local.get $5
             local.get $5
             i32.const 16
             local.get $5
             i32.const 255
             i32.and
             i32.const 16
             i32.lt_u
             select
             i32.sub
             local.set $5
             local.get $4
             local.get $4
             i32.const 16
             local.get $4
             i32.const 255
             i32.and
             i32.const 16
             i32.lt_u
             select
             i32.sub
            else
             local.get $4
            end
           else
            local.get $4
           end
           i32.store8
           local.get $9
           local.get $5
           i32.store8 offset=1
           local.get $9
           local.get $6
           i32.store8 offset=2
          end
          local.get $11
          i32.const 1
          i32.add
          local.set $11
          br $for-loop|4
         end
        end
        local.get $10
        i32.const 1
        i32.add
        local.set $10
        br $for-loop|3
       end
      end
      local.get $8
      i32.const 1
      i32.add
      local.set $8
      br $for-loop|2
     end
    end
    local.get $7
    i32.const 1
    i32.add
    local.set $7
    br $for-loop|1
   end
  end
 )
)
