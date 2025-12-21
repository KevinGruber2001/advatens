import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { schemas } from "../../generated.api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "../hooks/useApiClient"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet"

function CreateOrchard() {
  type FormData = z.infer<typeof schemas.OrchardCreate>
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const form = useForm<FormData>({
    resolver: zodResolver(schemas.OrchardCreate),
    defaultValues: {
      name: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (newOrchard: FormData) => {
      return apiClient.createOrchard(newOrchard)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchard", "list"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="mb-4">Create a Orchard</SheetTitle>
        <SheetDescription asChild>
          <Form {...form}>
            <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>The name of the orchard</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Form>
        </SheetDescription>
      </SheetHeader>
    </>
  )
}

export default CreateOrchard
